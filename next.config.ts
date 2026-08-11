import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// This app builds twice: from the workspace root, and from its subtree
	// mirror where `../..` is not a workspace at all. Turbopack infers the root
	// by walking up for a lockfile, and in the monorepo it finds the one at the
	// top — pointing it there explicitly keeps both builds resolving the same
	// files instead of whichever ancestor happened to look root-shaped.
	turbopack: {
		root: path.join(__dirname, "../.."),
	},
};

export default nextConfig;
