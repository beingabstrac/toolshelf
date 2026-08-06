const ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

export type PhPost = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  url: string;
  website: string | null;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  thumbnailUrl: string | null;
  previewImageUrl: string | null;
  topics: string[];
};

type PhNode = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  url: string;
  website?: string | null;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  thumbnail?: { url?: string | null } | null;
  media?: Array<{ url?: string | null; type?: string | null }> | null;
  topics?: {
    edges?: Array<{ node?: { name?: string | null } | null }> | null;
  } | null;
};

type GraphqlResponse = {
  data?: {
    posts?: {
      edges?: Array<{ node?: PhNode | null } | null> | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
};

const POSTS_QUERY = `
query ToolshelfPosts($first: Int!) {
  posts(first: $first, order: NEWEST) {
    edges {
      node {
        id
        slug
        name
        tagline
        url
        website
        votesCount
        commentsCount
        createdAt
        thumbnail { url }
        media { url type }
        topics(first: 6) {
          edges { node { name } }
        }
      }
    }
  }
}
`;

export function hasProductHuntToken(): boolean {
  return Boolean(process.env.PRODUCTHUNT_TOKEN?.trim());
}

function mapNode(node: PhNode | null | undefined): PhPost | null {
  if (!node?.id) return null;

  const mediaImage =
    node.media?.find((m) => m?.url && (!m.type || /image/i.test(m.type)))
      ?.url ??
    node.media?.[0]?.url ??
    null;

  const topics =
    node.topics?.edges
      ?.map((e) => e?.node?.name)
      .filter((name): name is string => Boolean(name)) ?? [];

  return {
    id: String(node.id),
    slug: node.slug,
    name: node.name,
    tagline: node.tagline,
    url: node.url,
    website: node.website ?? null,
    votesCount: node.votesCount ?? 0,
    commentsCount: node.commentsCount ?? 0,
    createdAt: node.createdAt,
    thumbnailUrl: node.thumbnail?.url ?? null,
    previewImageUrl: mediaImage || node.thumbnail?.url || null,
    topics,
  };
}

export async function fetchNewestPosts(first = 30): Promise<PhPost[]> {
  const token = process.env.PRODUCTHUNT_TOKEN?.trim();
  if (!token) {
    throw new Error("PRODUCTHUNT_TOKEN is not set");
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: POSTS_QUERY,
      variables: { first },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Product Hunt API ${res.status}: ${text.slice(0, 240)}`);
  }

  const json = (await res.json()) as GraphqlResponse;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }

  const edges = json.data?.posts?.edges ?? [];
  return edges
    .map((edge) => mapNode(edge?.node))
    .filter((p): p is PhPost => Boolean(p));
}

/** Prefer the maker website. Never return a bare PH redirect as the product URL. */
export function productUrl(post: PhPost): string | null {
  const site = post.website?.trim();
  if (!site) return null;
  try {
    const host = new URL(site).hostname.toLowerCase();
    if (host.includes("producthunt.com")) return null;
  } catch {
    return null;
  }
  return site;
}
