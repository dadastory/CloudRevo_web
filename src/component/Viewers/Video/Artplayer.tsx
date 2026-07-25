import { Box, BoxProps } from "@mui/material";
import { fileExtension } from "../../../util";
import Artplayer from "artplayer";
import artplayerPluginChapter from "artplayer-plugin-chapter";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import { CrMaskedPrefix } from "./VideoViewer";
import Hls, {
  type FragmentLoaderContext,
  type HlsConfig,
  type Loader,
  type LoaderCallbacks,
  type LoaderConfiguration,
  type LoaderContext,
  type PlaylistLoaderContext,
} from "hls.js";
import mpegts from "mpegts.js";
import i18next from "i18next";
import { useEffect, useRef } from "react";
import "./artplayer.css";

export interface PlayerProps extends BoxProps {
  option: any;
  getInstance?: (instance: Artplayer) => void;
  chapters?: any;
  m3u8UrlTransform?: (url: string, isPlaylist?: boolean) => Promise<string>;
  getEntityUrl?: (url: string) => Promise<string>;
}

type LoaderConstructor<T extends LoaderContext> = new (config: HlsConfig) => Loader<T>;

const isFragmentLoaderContext = (context: LoaderContext): context is FragmentLoaderContext => "frag" in context;

const createUrlTransformLoader = <T extends LoaderContext>(
  transform: (url: string, isPlaylist?: boolean) => Promise<string>,
  isPlaylist: boolean,
): LoaderConstructor<T> => {
  const DefaultLoader = Hls.DefaultConfig.loader as unknown as LoaderConstructor<T>;

  return class extends DefaultLoader {
    load(context: T, config: LoaderConfiguration, callbacks: LoaderCallbacks<T>) {
      void transform(context.url, isPlaylist).then((url) => {
        context.url = url;
        if (isFragmentLoaderContext(context)) {
          context.frag.url = url;
        }

        const transformedCallbacks: LoaderCallbacks<T> = {
          ...callbacks,
          onSuccess: (response, stats, successContext, networkDetails) => {
            response.url = url;
            callbacks.onSuccess(response, stats, successContext, networkDetails);
          },
        };
        super.load(context, config, transformedCallbacks);
      });
    }
  };
};

const hasNumberHeight = (value: object): value is { height: number } => "height" in value && typeof value.height === "number";
const hasStringName = (value: object): value is { name: string } => "name" in value && typeof value.name === "string";

const playM3u8 =
  (
    urlTransform?: (url: string, isPlaylist?: boolean) => Promise<string>,
    getEntityUrl?: (url: string) => Promise<string>,
  ) =>
  (video: HTMLVideoElement, url: string, art: Artplayer) => {
    if (Hls.isSupported()) {
      if (art.hls) art.hls.destroy();
      const hls = new Hls({
        ...(urlTransform
          ? {
              fLoader: createUrlTransformLoader<FragmentLoaderContext>(urlTransform, false),
              pLoader: createUrlTransformLoader<PlaylistLoaderContext>(urlTransform, true),
            }
          : {}),
        xhrSetup: async (xhr, url) => {
          // Always send cookies, even for cross-origin calls.
          if (url.startsWith(CrMaskedPrefix)) {
            if (getEntityUrl) {
              xhr.open("GET", await getEntityUrl(url), true);
              return;
            }
          }
        },
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      art.hls = hls;
      art.on("destroy", () => hls.destroy());
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    } else {
      art.notice.show = "Unsupported playback format: m3u8";
    }
  };

const playFlv = (video: HTMLVideoElement, url: string, art: Artplayer) => {
  if (mpegts.isSupported()) {
    if (art.flv) art.flv.destroy();
    const flv = mpegts.createPlayer(
      {
        type: "flv",
        url: url,
      },
      {
        lazyLoadMaxDuration: 5 * 60,
        accurateSeek: true,
      },
    );
    flv.attachMediaElement(video);
    flv.load();
    art.flv = flv;
    art.on("destroy", () => flv.destroy());
  } else {
    art.notice.show = "Unsupported playback format: flv";
  }
};

export default function Player({
  option,
  chapters,
  getInstance,
  m3u8UrlTransform,
  getEntityUrl,
  ...rest
}: PlayerProps) {
  const artRef = useRef<Artplayer>();
  const ext = fileExtension(option.title);

  useEffect(() => {
    const opts = {
      ...option,
      plugins: [...option.plugins],
      container: artRef.current,
      customType: {
        ...option.customType,
        m3u8: playM3u8(m3u8UrlTransform, getEntityUrl),
        flv: playFlv,
      },
      type: ext,
    };

    if (chapters) {
      opts.plugins.push(artplayerPluginChapter({ chapters }));
    }

    if (ext === "m3u8") {
      opts.plugins.push(
        artplayerPluginHlsControl({
          quality: {
            // Show qualitys in control
            control: true,
            // Show qualitys in setting
            setting: true,
            // Get the quality name from level
            getName: (level) =>
              hasNumberHeight(level) ? level.height + "P" : i18next.t("application:fileManager.default"),
            // I18n
            title: i18next.t("application:fileManager.quality"),
            auto: i18next.t("application:fileManager.auto"),
          },
          audio: {
            // Show audios in control
            control: true,
            // Show audios in setting
            setting: true,
            // Get the audio name from track
            getName: (track) => (hasStringName(track) ? track.name : i18next.t("application:fileManager.default")),
            // I18n
            title: i18next.t("application:fileManager.audioTrack"),
            auto: i18next.t("application:fileManager.auto"),
          },
        }),
      );
    }

    const art = new Artplayer(opts);

    if (getInstance && typeof getInstance === "function") {
      getInstance(art);
    }

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, []);

  return <Box ref={artRef} {...rest}></Box>;
}
