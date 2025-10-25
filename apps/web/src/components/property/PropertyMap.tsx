import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
  Chip,
} from '@mui/material';

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyMapProps {
  properties: any[];
  center?: [number, number];
  zoom?: number;
  height?: string | number;
}

// Component to update map view when center prop changes
const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const PropertyMap = ({
  properties,
  center = [48.8566, 2.3522], // Default to Paris
  zoom = 5,
  height = '100%',
}: PropertyMapProps) => {
  const { t } = useTranslation(['property', 'common']);
  const navigate = useNavigate();
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [mapZoom, setMapZoom] = useState<number>(zoom);

  // Update map center and zoom based on properties
  useEffect(() => {
    if (properties.length > 0) {
      // If only one property, center on it with higher zoom
      if (properties.length === 1 && properties[0].location?.lat && properties[0].location?.lng) {
        setMapCenter([properties[0].location.lat, properties[0].location.lng]);
        setMapZoom(13);
      } else {
        // Calculate bounds to fit all properties
        const bounds = L.latLngBounds(
          properties
            .filter(p => p.location?.lat && p.location?.lng)
            .map(p => [p.location.lat, p.location.lng])
        );
        
        if (bounds.isValid()) {
          // Get center of bounds
          const center = bounds.getCenter();
          setMapCenter([center.lat, center.lng]);
          
          // Adjust zoom based on bounds size
          const boundsSize = Math.max(
            bounds.getNorth() - bounds.getSouth(),
            bounds.getEast() - bounds.getWest()
          );
          
          // Rough calculation for zoom level based on bounds size
          if (boundsSize > 10) setMapZoom(5);
          else if (boundsSize > 5) setMapZoom(6);
          else if (boundsSize > 2) setMapZoom(7);
          else if (boundsSize > 1) setMapZoom(8);
          else if (boundsSize > 0.5) setMapZoom(9);
          else if (boundsSize > 0.1) setMapZoom(10);
          else if (boundsSize > 0.05) setMapZoom(11);
          else if (boundsSize > 0.01) setMapZoom(12);
          else setMapZoom(13);
        }
      }
    }
  }, [properties]);

  // Format price based on currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Navigate to property details
  const handlePropertyClick = (id: string) => {
    navigate(`/properties/${id}`);
  };

  return (
    <Box sx={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeView center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {properties
          .filter(property => property.location?.lat && property.location?.lng)
          .map(property => (
            <Marker
              key={property.id}
              position={[property.location.lat, property.location.lng]}
            >
              <Popup minWidth={250} maxWidth={300}>
                <Card sx={{ boxShadow: 'none' }}>
                  <CardActionArea onClick={() => handlePropertyClick(property.id)}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={property.images[0]}
                      alt={property.title}
                    />
                    <CardContent sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {formatPrice(property.price, property.currency)}
                        </Typography>
                        <Chip
                          label={t(`property:listingTypes.${property.listingType.toLowerCase()}`)}
                          size="small"
                          color={property.listingType === 'SALE' ? 'secondary' : 'success'}
                        />
                      </Box>
                      <Typography variant="body2" noWrap>
                        {property.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {property.location.city}, {property.location.country}
                      </Typography>
                      {property.bedrooms !== undefined && (
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Typography variant="caption">
                            {property.bedrooms} {t('property:features.bedrooms')}
                          </Typography>
                          {property.bathrooms !== undefined && (
                            <Typography variant="caption">
                              {property.bathrooms} {t('property:features.bathrooms')}
                            </Typography>
                          )}
                          {property.size !== undefined && (
                            <Typography variant="caption">
                              {property.size} m²
                            </Typography>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </Box>
  );
};