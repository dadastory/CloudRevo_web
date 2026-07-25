import {
  Autocomplete,
  Box,
  Button,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { enqueueSnackbar } from "notistack";
import {
  getFileInfo,
  getSearchShareGroups,
  getSearchUser,
  getUserInfo,
  resolveShareGroups,
  sendPatchShareAccessRule,
} from "../../../api/api.ts";
import { ShareAccessRule, SharePermission } from "../../../api/explorer.ts";
import { Group, User } from "../../../api/user.ts";
import { closeFilePermissionDialog } from "../../../redux/globalStateSlice.ts";
import { fileUpdated } from "../../../redux/fileManagerSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { FileManagerIndex } from "../FileManager.tsx";
import { AudienceAvatar, AudiencePermissionRow, type PermissionAudienceIdentity } from "./PermissionAudience.tsx";
import { canAddNamedAudience, defaultAccessRule, updateNamedAudienceRule } from "./filePermissionRule.ts";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";

type Identity = PermissionAudienceIdentity;

const PermissionList = styled(List)(({ theme }) => ({
  padding: 0,
  "& > li + li": { borderTop: `1px solid ${theme.palette.divider}` },
}));

const FilePermissions = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.globalState.filePermissionDialogOpen);
  const file = useAppSelector((state) => state.globalState.filePermissionDialogFile);
  const [rule, setRule] = useState<ShareAccessRule>(defaultAccessRule());
  const [identities, setIdentities] = useState<Record<string, Identity>>({});
  const [searchValue, setSearchValue] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [searchedGroups, setSearchedGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRule(file?.access_rule ?? defaultAccessRule());
    setIdentities({});
  }, [file]);
  useEffect(() => {
    if (!open) return;
    const userIDs = Object.keys(file?.access_rule?.users ?? {});
    const groupIDs = Object.keys(file?.access_rule?.groups ?? {});
    if (!userIDs.length && !groupIDs.length) return;

    let active = true;
    const users = Promise.all(userIDs.map((id) => dispatch(getUserInfo(id)).catch(() => undefined)));
    const groups = groupIDs.length ? dispatch(resolveShareGroups(groupIDs)).catch(() => []) : Promise.resolve([]);
    Promise.all([users, groups]).then(([users, groups]) => {
      if (!active) return;
      setIdentities((current) => ({
        ...current,
        ...Object.fromEntries(
          users
            .filter((user): user is User => !!user)
            .map((user) => [`users:${user.id}`, { id: user.id, name: user.nickname, kind: "user" as const, user }]),
        ),
        ...Object.fromEntries(
          groups.map((group) => [`groups:${group.id}`, { id: group.id, name: group.name, kind: "group" as const }]),
        ),
      }));
    });

    return () => {
      active = false;
    };
  }, [dispatch, file, open]);
  useEffect(() => {
    if (searchValue.trim().length < 2) {
      setSearchedUsers([]);
      setSearchedGroups([]);
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch(getSearchUser(searchValue))
        .then(setSearchedUsers)
        .catch(() => setSearchedUsers([]));
      dispatch(getSearchShareGroups(searchValue))
        .then(setSearchedGroups)
        .catch(() => setSearchedGroups([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [dispatch, searchValue]);

  const close = () => dispatch(closeFilePermissionDialog());
  const updateAudience = (audience: "anonymous" | "authenticated", permission: SharePermission) =>
    setRule((current) => ({ ...current, [audience]: permission }));
  const updateNamedAudience = (audience: "users" | "groups", id: string, permission?: SharePermission) =>
    setRule((current) => updateNamedAudienceRule(current, audience, id, permission));
  const identityFor = (audience: "users" | "groups", id: string): Identity =>
    identities[`${audience}:${id}`] ?? {
      name:
        audience === "groups"
          ? `${t("application:modals.specificGroups")} #${id}`
          : `${t("application:modals.specificUsers")} #${id}`,
      kind: audience === "groups" ? "group" : "user",
    };
  const searchOptions = useMemo<Identity[]>(
    () => [
      ...searchedUsers.map((user) => ({ id: user.id, name: user.nickname, kind: "user" as const, user })),
      ...searchedGroups.map((group) => ({ id: group.id, name: group.name, kind: "group" as const })),
    ],
    [searchedGroups, searchedUsers],
  );
  const hasRule = useMemo(() => !!file?.access_rule, [file?.access_rule]);
  const persist = async (accessRule?: ShareAccessRule) => {
    if (!file) return;
    setSaving(true);
    try {
      await dispatch(sendPatchShareAccessRule({ uri: file.path, access_rule: accessRule }));
      const savedFile = await dispatch(getFileInfo({ uri: file.path }));
      dispatch(
        fileUpdated({
          index: FileManagerIndex.main,
          value: [{ file: savedFile, oldPath: file.path }],
        }),
      );
      enqueueSnackbar(t("application:modals.saved"), { variant: "success" });
      close();
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    await persist(rule);
  };
  const clear = async () => {
    await persist();
  };

  return (
    <DraggableDialog
      title={t("application:modals.filePermissions")}
      showActions
      showCancel
      loading={saving}
      onAccept={save}
      secondaryAction={
        hasRule ? (
          <Button color="inherit" disabled={saving} onClick={clear}>
            {t("application:modals.clearCustomPermissions")}
          </Button>
        ) : undefined
      }
      dialogProps={{ open: !!open, onClose: close, fullWidth: true, maxWidth: "xs" }}
    >
      <DialogContent sx={{ pb: 1 }}>
        <Stack spacing={2}>
          <Autocomplete
            options={searchOptions}
            value={null}
            inputValue={searchValue}
            onInputChange={(_event, value) => setSearchValue(value)}
            onChange={(_event, identity: Identity | null) => {
              if (!identity?.id) return;
              const audience = identity.kind === "group" ? "groups" : "users";
              if (!canAddNamedAudience(rule, audience, identity.id)) return;
              setIdentities((current) => ({ ...current, [`${audience}:${identity.id}`]: identity }));
              updateNamedAudience(audience, identity.id, rule[audience]?.[identity.id] ?? { read: true });
              setSearchValue("");
            }}
            getOptionLabel={(identity) => identity.name}
            isOptionEqualToValue={(option, value) => option.kind === value.kind && option.id === value.id}
            renderOption={(props, identity) => (
              <Box component="li" {...props} sx={{ gap: 1.25, display: "flex", alignItems: "center" }}>
                <AudienceAvatar identity={identity} />
                <Typography>{identity.name}</Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t("application:modals.searchUserOrGroup")}
                variant="filled"
                InputProps={{ ...params.InputProps, disableUnderline: true }}
                sx={{ "& .MuiFilledInput-root": { borderRadius: 2, bgcolor: "action.hover", py: 0.8 } }}
              />
            )}
          />
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 600 }}>
              {t("application:modals.exactAccessPermissions")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
              {t("application:modals.exactAccessPermissionsDes")}
            </Typography>
            <PermissionList>
              {Object.entries(rule.users ?? {}).map(([id, permission]) => (
                <AudiencePermissionRow
                  key={`user-${id}`}
                  identity={identityFor("users", id)}
                  permission={permission}
                  onChange={(next) => updateNamedAudience("users", id, next)}
                  onRemove={() => updateNamedAudience("users", id)}
                />
              ))}
              {Object.entries(rule.groups ?? {}).map(([id, permission]) => (
                <AudiencePermissionRow
                  key={`group-${id}`}
                  identity={identityFor("groups", id)}
                  permission={permission}
                  onChange={(next) => updateNamedAudience("groups", id, next)}
                  onRemove={() => updateNamedAudience("groups", id)}
                />
              ))}
              {!Object.keys(rule.users ?? {}).length && !Object.keys(rule.groups ?? {}).length && (
                <ListItem>
                  <ListItemText secondary={t("application:modals.noExactAccessPermissions")} />
                </ListItem>
              )}
            </PermissionList>
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 600 }}>
              {t("application:modals.commonAccessPermissions")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
              {t("application:modals.commonAccessPermissionsDes")}
            </Typography>
            <PermissionList>
              <AudiencePermissionRow
                identity={{ name: t("application:modals.anonymousVisitors"), kind: "anonymous" }}
                permission={rule.anonymous}
                onChange={(next) => updateAudience("anonymous", next)}
              />
              <AudiencePermissionRow
                identity={{ name: t("application:modals.authenticatedVisitors"), kind: "authenticated" }}
                permission={rule.authenticated}
                onChange={(next) => updateAudience("authenticated", next)}
              />
            </PermissionList>
          </Box>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default FilePermissions;
