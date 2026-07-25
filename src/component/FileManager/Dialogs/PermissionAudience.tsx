import CloseRounded from "@mui/icons-material/CloseRounded";
import ExpandMore from "@mui/icons-material/ExpandMore";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import PublicRounded from "@mui/icons-material/PublicRounded";
import { Avatar, Box, Checkbox, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText, Popover } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiPrefix } from "../../../api/request.ts";
import type { SharePermission } from "../../../api/explorer.ts";
import type { User } from "../../../api/user.ts";

type PermissionKey = keyof SharePermission;
const permissionKeys: PermissionKey[] = ["read", "create", "update", "delete"];

export type PermissionAudienceIdentity = {
  id?: string;
  name: string;
  kind: "user" | "group" | "anonymous" | "authenticated";
  user?: User;
};

export const AudienceAvatar = ({ identity }: { identity: PermissionAudienceIdentity }) => {
  if (identity.kind === "user") {
    return (
      <Avatar src={identity.user ? `${ApiPrefix}/user/avatar/${identity.user.id}` : undefined} sx={{ width: 34, height: 34, fontSize: 14, bgcolor: "primary.main" }}>
        {identity.name.slice(0, 1).toUpperCase()}
      </Avatar>
    );
  }

  const Icon = identity.kind === "group" ? GroupsRounded : identity.kind === "anonymous" ? PublicRounded : PersonOutlineRounded;
  const colors = {
    group: { bgcolor: "#43a047", color: "common.white" },
    anonymous: { bgcolor: "#9e9e9e", color: "common.white" },
    authenticated: { bgcolor: "#03a9f4", color: "common.white" },
  };
  return <Avatar sx={{ width: 40, height: 40, ...colors[identity.kind] }}><Icon fontSize="small" /></Avatar>;
};

export const AudiencePermissionRow = ({
  identity,
  permission,
  onChange,
  onRemove,
}: {
  identity: PermissionAudienceIdentity;
  permission?: SharePermission;
  onChange: (permission: SharePermission) => void;
  onRemove?: () => void;
}) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const expanded = Boolean(anchorEl);
  const enabled = permissionKeys.filter((key) => permission?.[key]);
  const summary = enabled.length
    ? enabled.map((key) => t(`application:modals.permission${key[0].toUpperCase()}${key.slice(1)}`)).join(" · ")
    : t("application:modals.noPermissions");

  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <ListItemButton
        aria-expanded={expanded ? "true" : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ py: 0.75, px: 0, transition: "background-color 160ms ease-out, transform 160ms ease-out", "&:active": { transform: "scale(0.99)" } }}
      >
        <ListItemAvatar sx={{ minWidth: 52 }}><AudienceAvatar identity={identity} /></ListItemAvatar>
        <ListItemText primary={identity.name} secondary={summary} primaryTypographyProps={{ fontWeight: 500, noWrap: true }} secondaryTypographyProps={{ variant: "body2", color: enabled.length ? "text.secondary" : "warning.main", noWrap: true }} />
        {onRemove && <IconButton aria-label={t("application:modals.removePermissionAudience")} edge="end" size="small" onClick={(event) => { event.stopPropagation(); onRemove(); }}><CloseRounded fontSize="small" /></IconButton>}
        <IconButton aria-label={t("application:modals.editPermissions")} edge="end" size="small" tabIndex={-1}><ExpandMore sx={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease" }} /></IconButton>
      </ListItemButton>
      <Popover
        open={expanded}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{ paper: { sx: { mt: 0.5, width: 360, maxWidth: "calc(100vw - 32px)", borderRadius: 2, overflow: "hidden", boxShadow: 8 } } }}
      >
        <List disablePadding>
          {permissionKeys.map((key) => (
            <ListItemButton
              key={key}
              onClick={() => onChange({ ...permission, [key]: !permission?.[key] })}
              sx={{ alignItems: "flex-start", px: 1.5, py: 1, "& + &": { borderTop: 1, borderColor: "divider" } }}
            >
              <ListItemIcon sx={{ minWidth: 40, mt: 0 }}>
                <Checkbox checked={!!permission?.[key]} tabIndex={-1} disableRipple />
              </ListItemIcon>
              <ListItemText
                primary={t(`application:modals.permission${key[0].toUpperCase()}${key.slice(1)}`)}
                secondary={t(`application:modals.permission${key[0].toUpperCase()}${key.slice(1)}Des`)}
                primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                secondaryTypographyProps={{ variant: "caption", sx: { mt: 0.15, lineHeight: 1.45 } }}
              />
            </ListItemButton>
          ))}
        </List>
      </Popover>
    </ListItem>
  );
};
