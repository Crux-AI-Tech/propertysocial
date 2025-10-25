import { Box, Typography } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

interface LogoProps {
  height?: number;
  showText?: boolean;
}

export const Logo = ({ height = 40, showText = true }: LogoProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: 1,
          height: height,
          width: height,
        }}
      >
        <HomeIcon sx={{ fontSize: height * 0.6 }} />
      </Box>
      
      {showText && (
        <Typography
          variant="h6"
          component="div"
          sx={{
            ml: 1,
            fontWeight: 700,
            color: 'text.primary',
            fontSize: height * 0.45,
            display: 'flex',
            flexDirection: 'column',
            lineHeight: 1.1,
          }}
        >
          <span>EU Real</span>
          <span>Estate</span>
        </Typography>
      )}
    </Box>
  );
};

export default Logo;