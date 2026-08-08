import Link from "next/link";
import type { Tool } from "@/lib/db/schema";
import { trackAttrs } from "@/lib/analytics";
import { cardMediaUrl } from "@/lib/enrich/media";
import { PreviewFrame } from "./preview-frame";
import { ToolLogo } from "./tool-logo";
import styles from "@/app/tools/[slug]/detail.module.css";

/** Compare entry next to Visit. Pick a peer without scrolling. */
export function ComparePeers({
  tool,
  peers,
}: {
  tool: Tool;
  peers: Tool[];
}) {
  if (peers.length < 1) return null;

  const shown = peers.slice(0, 3);

  return (
    <div className={styles.comparePeers}>
      <div className={styles.comparePeersHead}>
        <p className={styles.comparePeersLabel}>Compare with</p>
        <Link
          href={`/compare?a=${tool.slug}`}
          className={styles.comparePeersAll}
          {...trackAttrs("compare_peer_click", {
            a: tool.slug,
            placement: "see_all",
          })}
        >
          See all
        </Link>
      </div>
      <ul className={styles.comparePeersList}>
        {shown.map((peer) => {
          const media = cardMediaUrl(peer);
          const accent = peer.brandColor ?? "oklch(0.42 0.08 145)";
          return (
            <li key={peer.id}>
              <Link
                href={`/compare?a=${tool.slug}&b=${peer.slug}`}
                className={styles.comparePeer}
                aria-label={`Compare ${tool.name} with ${peer.name}`}
                {...trackAttrs("compare_peer_click", {
                  a: tool.slug,
                  b: peer.slug,
                  placement: "detail_peers",
                })}
              >
                <span
                  className={styles.comparePeerThumb}
                  style={{ background: accent }}
                  aria-hidden="true"
                >
                  <PreviewFrame
                    src={media}
                    fallback={<ToolLogo tool={peer} size={22} />}
                  />
                </span>
                <span className={styles.comparePeerName}>{peer.name}</span>
                <span className={styles.comparePeerVs} aria-hidden="true">
                  vs
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
