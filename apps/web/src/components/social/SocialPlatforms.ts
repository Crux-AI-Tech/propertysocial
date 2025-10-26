import React from 'react';
import {
  Facebook,
  Twitter,
  LinkedIn,
  Instagram,
  WhatsApp,
  Telegram,
  Email,
  Link as LinkIcon,
  Pinterest,
  Reddit,
} from '@mui/icons-material';
import { SocialPlatform, ShareParams } from './SocialShareButton';

// Utility function to encode URL parameters
const encodeParams = (params: Record<string, string>) => {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
};

export const socialPlatforms: Record<string, SocialPlatform> = {
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: React.createElement(Facebook),
    color: '#1877F2',
    nativeApp: 'fb://share?href={url}',
    shareUrl: (params: ShareParams) => {
      const fbParams = encodeParams({
        u: params.url,
        quote: `${params.title} - ${params.description}`,
      });
      return `https://www.facebook.com/sharer/sharer.php?${fbParams}`;
    },
  },

  twitter: {
    id: 'twitter',
    name: 'Twitter',
    icon: React.createElement(Twitter),
    color: '#1DA1F2',
    nativeApp: 'twitter://post?message={url}',
    shareUrl: (params: ShareParams) => {
      const hashtags = params.hashtags?.join(',') || 'realestate,property';
      const twitterParams = encodeParams({
        url: params.url,
        text: `${params.title} - ${params.description}`,
        hashtags,
      });
      return `https://twitter.com/intent/tweet?${twitterParams}`;
    },
  },

  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: React.createElement(LinkedIn),
    color: '#0A66C2',
    shareUrl: (params: ShareParams) => {
      const linkedinParams = encodeParams({
        url: params.url,
        title: params.title,
        summary: params.description,
      });
      return `https://www.linkedin.com/sharing/share-offsite/?${linkedinParams}`;
    },
  },

  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: React.createElement(WhatsApp),
    color: '#25D366',
    nativeApp: 'whatsapp://send?text={url}',
    shareUrl: (params: ShareParams) => {
      const message = `${params.title}\n\n${params.description}\n\n${params.url}`;
      const whatsappParams = encodeParams({
        text: message,
      });
      return `https://wa.me/?${whatsappParams}`;
    },
  },

  telegram: {
    id: 'telegram',
    name: 'Telegram',
    icon: React.createElement(Telegram),
    color: '#0088CC',
    nativeApp: 'tg://msg?text={url}',
    shareUrl: (params: ShareParams) => {
      const message = `${params.title}\n\n${params.description}`;
      const telegramParams = encodeParams({
        url: params.url,
        text: message,
      });
      return `https://t.me/share/url?${telegramParams}`;
    },
  },

  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: React.createElement(Instagram),
    color: '#E4405F',
    shareUrl: (params: ShareParams) => {
      // Instagram doesn't have direct URL sharing, so we'll copy to clipboard
      return params.url;
    },
  },

  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    icon: React.createElement(Pinterest),
    color: '#BD081C',
    shareUrl: (params: ShareParams) => {
      const pinterestParams = encodeParams({
        url: params.url,
        description: `${params.title} - ${params.description}`,
        media: params.image || '',
      });
      return `https://pinterest.com/pin/create/button/?${pinterestParams}`;
    },
  },

  reddit: {
    id: 'reddit',
    name: 'Reddit',
    icon: React.createElement(Reddit),
    color: '#FF4500',
    shareUrl: (params: ShareParams) => {
      const redditParams = encodeParams({
        url: params.url,
        title: params.title,
      });
      return `https://reddit.com/submit?${redditParams}`;
    },
  },

  email: {
    id: 'email',
    name: 'Email',
    icon: React.createElement(Email),
    color: '#34495E',
    shareUrl: (params: ShareParams) => {
      const emailParams = encodeParams({
        subject: params.title,
        body: `${params.description}\n\nView property: ${params.url}`,
      });
      return `mailto:?${emailParams}`;
    },
  },

  copy: {
    id: 'copy',
    name: 'Copy Link',
    icon: React.createElement(LinkIcon),
    color: '#6C757D',
    shareUrl: (params: ShareParams) => {
      // This will be handled specially in the component
      return params.url;
    },
  },
};

// Predefined platform groups for different use cases
export const platformGroups = {
  all: Object.keys(socialPlatforms),
  social: ['facebook', 'twitter', 'linkedin', 'instagram'],
  messaging: ['whatsapp', 'telegram', 'email'],
  professional: ['linkedin', 'email', 'copy'],
  popular: ['facebook', 'twitter', 'whatsapp', 'linkedin', 'copy'],
  realEstate: ['facebook', 'linkedin', 'whatsapp', 'email', 'copy'],
};