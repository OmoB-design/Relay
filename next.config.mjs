/** @type {import('next').NextConfig} */

/* Client logos are served from Supabase Storage, so next/image has to be told
   that host is allowed. It is DERIVED from the env var rather than written out:
   the project ref differs between local, preview and production, and a
   hardcoded hostname would work everywhere it was tested and fail on deploy.
   next/image refuses an unlisted host by THROWING, which takes the whole page
   down rather than just the picture — that is how this was found. */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
