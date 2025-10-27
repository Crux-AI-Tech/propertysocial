import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Create a theme instance - Instagram-style modern design
let theme = createTheme({
  palette: {
    primary: {
      main: '#0095f6', // Instagram blue
      light: '#4db5ff',
      dark: '#0066c3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ed4956', // Instagram red/pink
      light: '#ff7b85',
      dark: '#c13584',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ed4956',
    },
    warning: {
      main: '#ffc107',
    },
    info: {
      main: '#0095f6',
    },
    success: {
      main: '#00d084',
    },
    background: {
      default: '#fafafa', // Instagram light gray
      paper: '#ffffff',
    },
    text: {
      primary: '#262626', // Instagram dark text
      secondary: '#8e8e8e', // Instagram gray text
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
    body1: {
      fontSize: '0.9375rem', // 15px - Instagram size
    },
    body2: {
      fontSize: '0.875rem', // 14px
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          fontWeight: 600,
          '&:hover': {
            boxShadow: 'none',
            opacity: 0.9,
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderWidth: 1,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Instagram uses no rounded corners on cards
          boxShadow: 'none',
          border: '1px solid #dbdbdb',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            backgroundColor: '#fafafa',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid #dbdbdb',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 600,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
  },
});

// Apply responsive font sizes
theme = responsiveFontSizes(theme);

export { theme };