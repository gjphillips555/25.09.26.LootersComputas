import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Menu, MessageCircle, Search, Send, Settings, Shield, Users, X } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ARTWORK } from "@/lib/artwork";
import {
  currentNotifyPermission,
  enablePushNotifications,
  ensureNotifyPermission,
  playPffftSound,
  pushSupport,
  showPrivateMessageNotification,
} from "@/lib/siftah-message/notify";

export const Route = createFileRoute("/siftah-message")({
  component: SiftahMessagePage,
  head: () => ({ meta: [{ title: "Siftah Message · Looters Computas" }] }),
});
