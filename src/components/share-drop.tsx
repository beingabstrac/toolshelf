"use client";

import { ShareButton } from "./share-button";

/** Drop page share — defaults to /drop unless a week path is passed. */
export function ShareDrop({
  title,
  text,
  url = "/drop",
}: {
  title: string;
  text: string;
  url?: string;
}) {
  return (
    <ShareButton
      title={title}
      text={text}
      url={url}
      className="btn"
      surface="drop"
    />
  );
}
