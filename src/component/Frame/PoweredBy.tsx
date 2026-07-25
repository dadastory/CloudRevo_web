import { Box, BoxProps, Typography, useTheme } from "@mui/material";

export interface PoweredByProps extends BoxProps {}

const PoweredBy = ({ ...rest }: PoweredByProps) => {
  const theme = useTheme();
  return (
    <Box {...rest}>
      <Box
        component="a"
        marginBottom={2}
        href="https://github.com/dadastory/CloudRevo"
        target="_blank"
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 1,
          textDecoration: "none",
          "& img": {
            filter: "grayscale(100%)",
            opacity: 0.3,
          },
          "&:hover": {
            "& img": {
              filter: "grayscale(0%)",
              opacity: 1,
            },
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: (theme) => theme.palette.action.disabled,
          }}
          fontWeight={500}
        >
          Powered by
        </Typography>
        <Box
          component="img"
          alt="CloudRevo"
          sx={{
            height: 20,
          }}
          src={theme.palette.mode === "dark" ? "/static/img/logo_light.svg" : "/static/img/logo.svg"}
        />
      </Box>
    </Box>
  );
};

export default PoweredBy;
