import PageHeader, { PageTabQuery } from "../PageHeader.tsx";
import { Button, Container, Grow } from "@mui/material";
import * as React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import ResponsiveTabs from "../../Common/ResponsiveTabs.tsx";
import DavAccountList from "./DavAccountList.tsx";
import Add from "../../Icons/Add.tsx";
import { useAppSelector } from "../../../redux/hooks.ts";
import Nothing from "../../Common/Nothing.tsx";
import SessionManager from "../../../session";
import Boolset from "../../../util/boolset.ts";
import { GroupPermission } from "../../../api/user.ts";
import PageContainer from "../PageContainer.tsx";

export enum DevicePageTab {
  Dav = "dav",
}

const Devices = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [creatAccountDialog, setCreateAccountDialog] = useState(false);

  const webDavEnabled = useMemo(() => {
    const user = SessionManager.currentLoginOrNull();
    let enabled = false;
    if (user && user.user.group?.permission) {
      const bs = new Boolset(user.user.group.permission);
      enabled = bs.enabled(GroupPermission.webdav);
    }

    return enabled;
  }, []);

  const tabs = useMemo(() => {
    const res = [];
    if (webDavEnabled) {
      res.push({
        label: t("application:setting.webdavAccounts"),
        value: DevicePageTab.Dav,
      });
    }
    return res;
  }, [webDavEnabled]);

  const [tab, setTab] = useState(
    searchParams.get(PageTabQuery) ?? DevicePageTab.Dav,
  );

  return (
    <PageContainer>
      <Container maxWidth="lg">
        <PageHeader
          secondaryAction={
            <Grow in={tab == DevicePageTab.Dav}>
              <Button variant={"contained"} startIcon={<Add />} onClick={() => setCreateAccountDialog(true)}>
                {t("setting.createNewAccount")}
              </Button>
            </Grow>
          }
          title={t("application:navbar.connect")}
        />
        <ResponsiveTabs value={tab} onChange={(_e, newValue) => setTab(newValue)} tabs={tabs} />
        {tab == DevicePageTab.Dav && webDavEnabled && (
          <DavAccountList creatAccountDialog={creatAccountDialog} setCreateAccountDialog={setCreateAccountDialog} />
        )}
        {!webDavEnabled && <Nothing primary={t("setting.deviceNothing")} />}
      </Container>
    </PageContainer>
  );
};

export default Devices;
