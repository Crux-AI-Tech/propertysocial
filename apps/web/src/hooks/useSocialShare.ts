import { useState, useCallback } from 'react';
import { ShareParams, SocialPlatform } from '../components/social/SocialShareButton';

export interface ShareAnalytics {
  platform: string;
  shares: number;
  clicks: number;
  lastShared: Date;
}

export interface UseSocialShareOptions {
  propertyId?: string;
  trackAnalytics?: boolean;
  onShare?: (platform: SocialPlatform, shareParams: ShareParams) => void;
}

export const useSocialShare = (options: UseSocialShareOptions = {}) => {
  const { propertyId, trackAnalytics = true, onShare } = options;
  
  const [analytics, setAnalytics] = useState<ShareAnalytics[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  // Generate share parameters for a property
  const generateShareParams = useCallback((property: any): ShareParams => {
    const baseUrl = window.location.origin;
    const propertyUrl = `${baseUrl}/properties/${property.id}`;
    
    const title = `${property.title} - €${property.price?.toLocaleString()}`;
    const description = `${property.bedrooms} bed, ${property.bathrooms} bath ${property.propertyType.toLowerCase()} in ${property.location.city}, ${property.location.country}. ${property.description?.substring(0, 100)}...`;
    
    const hashtags = [
      'realestate',
      'property',
      property.location.country.toLowerCase(),
      property.propertyType.toLowerCase(),
      property.listingType.toLowerCase(),
    ];

    // Add specific hashtags based on property features
    if (property.features?.luxury) hashtags.push('luxury');
    if (property.features?.garden) hashtags.push('garden');
    if (property.features?.parking) hashtags.push('parking');
    if (property.price && property.price > 500000) hashtags.push('premium');

    return {
      url: propertyUrl,
      title,
      description,
      image: property.images?.[0]?.url,
      hashtags,
    };
  }, []);

  // Track share event
  const trackShare = useCallback((platform: SocialPlatform, shareParams: ShareParams) => {
    if (!trackAnalytics) return;

    setAnalytics(prev => {
      const existing = prev.find(a => a.platform === platform.id);
      if (existing) {
        return prev.map(a => 
          a.platform === platform.id
            ? { ...a, shares: a.shares + 1, lastShared: new Date() }
            : a
        );
      } else {
        return [...prev, {
          platform: platform.id,
          shares: 1,
          clicks: 0,
          lastShared: new Date(),
        }];
      }
    });

    // Send analytics to backend (if needed)
    if (propertyId) {
      // API call to track share event
      fetch('/api/analytics/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          platform: platform.id,
          shareParams,
        }),
      }).catch(console.error);
    }
  }, [propertyId, trackAnalytics]);

  // Handle share action
  const handleShare = useCallback(async (platform: SocialPlatform, shareParams: ShareParams) => {
    setIsSharing(true);
    
    try {
      // Track the share
      trackShare(platform, shareParams);
      
      // Call custom onShare handler
      if (onShare) {
        onShare(platform, shareParams);
      }

      // Handle special cases
      if (platform.id === 'copy') {
        await navigator.clipboard.writeText(shareParams.url);
        return { success: true, message: 'Link copied to clipboard!' };
      }

      if (platform.id === 'instagram') {
        const content = `${shareParams.title}\n\n${shareParams.description}\n\n${shareParams.url}`;
        await navigator.clipboard.writeText(content);
        return { success: true, message: 'Content copied! Paste it in your Instagram post.' };
      }

      // For other platforms, the sharing is handled by the SocialShareButton component
      return { success: true, message: `Shared on ${platform.name}!` };
      
    } catch (error) {
      console.error('Share error:', error);
      return { success: false, message: 'Failed to share. Please try again.' };
    } finally {
      setIsSharing(false);
    }
  }, [trackShare, onShare]);

  // Get analytics for a specific platform
  const getPlatformAnalytics = useCallback((platformId: string) => {
    return analytics.find(a => a.platform === platformId);
  }, [analytics]);

  // Get total analytics
  const getTotalAnalytics = useCallback(() => {
    return analytics.reduce(
      (total, current) => ({
        shares: total.shares + current.shares,
        clicks: total.clicks + current.clicks,
      }),
      { shares: 0, clicks: 0 }
    );
  }, [analytics]);

  // Generate social media post content
  const generatePostContent = useCallback((property: any, platform: string) => {
    const shareParams = generateShareParams(property);
    
    switch (platform) {
      case 'twitter':
        // Twitter has character limits
        const twitterContent = `🏠 ${shareParams.title}\n\n📍 ${property.location.city}, ${property.location.country}\n💰 €${property.price?.toLocaleString()}\n\n${shareParams.url}`;
        return twitterContent.length > 280 ? twitterContent.substring(0, 277) + '...' : twitterContent;
        
      case 'linkedin':
        return `🏠 New Property Listing\n\n${shareParams.title}\n\n${shareParams.description}\n\nInterested? View details: ${shareParams.url}\n\n#RealEstate #Property #${property.location.country}`;
        
      case 'facebook':
        return `🏠 Check out this amazing property!\n\n${shareParams.title}\n\n${shareParams.description}\n\nWhat do you think? 💭\n\n${shareParams.url}`;
        
      default:
        return `${shareParams.title}\n\n${shareParams.description}\n\n${shareParams.url}`;
    }
  }, [generateShareParams]);

  return {
    generateShareParams,
    handleShare,
    trackShare,
    getPlatformAnalytics,
    getTotalAnalytics,
    generatePostContent,
    analytics,
    isSharing,
  };
};