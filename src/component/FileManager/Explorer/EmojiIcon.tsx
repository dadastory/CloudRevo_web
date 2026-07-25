import { SvgIconProps, Typography } from "@mui/material";

export interface EmojiIconProps extends Pick<SvgIconProps, "sx" | "fontSize"> {
  emoji: string;
}

const EmojiIcon = ({ sx, fontSize, emoji }: EmojiIconProps) => {
  return (
    <Typography
      sx={{
        color: (theme) => theme.palette.text.primary,
        minWidth: "24px",
        pl: "4px",
        ...sx,
      }}
      fontSize={fontSize}
    >
      {emoji}
    </Typography>
  );
};

export default EmojiIcon;
