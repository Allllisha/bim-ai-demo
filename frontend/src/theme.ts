import { createTheme } from '@mui/material/styles';

// プロフェショナル建築アプリテーマ
export const architecturalTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1B365D', // ダークネイビー（建築図面的）
      light: '#2E4B69',
      dark: '#0F2544',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E8B931', // アクセントゴールド
      light: '#F2C955',
      dark: '#D4A51C',
      contrastText: '#000000',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#5A5A5A',
    },
    grey: {
      50: '#F8F9FA',
      100: '#E9ECEF',
      200: '#DEE2E6',
      300: '#CED4DA',
      400: '#ADB5BD',
      500: '#6C757D',
      600: '#495057',
      700: '#343A40',
      800: '#212529',
      900: '#0D1117',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 300,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 400,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 400,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      letterSpacing: '0.03em',
    },
  },
  shape: {
    borderRadius: 4,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.06)',
    '0px 4px 6px rgba(0, 0, 0, 0.04), 0px 2px 4px rgba(0, 0, 0, 0.06)',
    '0px 8px 15px rgba(0, 0, 0, 0.04), 0px 3px 6px rgba(0, 0, 0, 0.08)',
    '0px 12px 24px rgba(0, 0, 0, 0.04), 0px 4px 8px rgba(0, 0, 0, 0.08)',
    '0px 16px 32px rgba(0, 0, 0, 0.04), 0px 6px 12px rgba(0, 0, 0, 0.08)',
    '0px 20px 40px rgba(0, 0, 0, 0.04), 0px 8px 16px rgba(0, 0, 0, 0.08)',
    '0px 24px 48px rgba(0, 0, 0, 0.04), 0px 10px 20px rgba(0, 0, 0, 0.08)',
    ...Array(17).fill('0px 24px 48px rgba(0, 0, 0, 0.04), 0px 10px 20px rgba(0, 0, 0, 0.08)'),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: '0px 2px 4px rgba(27, 54, 93, 0.15)',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(27, 54, 93, 0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid #E9ECEF',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
          },
        },
      },
    },
  },
});

export default architecturalTheme;