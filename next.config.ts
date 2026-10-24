import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings locally (OpenNext).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
