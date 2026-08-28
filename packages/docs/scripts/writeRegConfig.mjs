import { writeFile } from "node:fs/promises"

const required = [
  "VRT_REPORT_BASE_URL",
  "VRT_S3_BUCKET",
  "VRT_S3_ENDPOINT",
  "VRT_S3_PUBLIC_URL",
  "VRT_S3_REGION",
]

const missing = required.filter(
  (name) => !process.env[name],
)

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  )
}

const config = {
  core: {
    workingDir: ".reg",
    actualDir: ".vrt-actual",
    thresholdRate: 0.02,
    enableAntialias: true,
    addIgnore: true,
    ximgdiff: { invocationType: "client" },
  },
  plugins: {
    "reg-keygen-git-hash-plugin": {},
    "reg-publish-s3-plugin": {
      bucketName: process.env.VRT_S3_BUCKET,
      customDomain: process.env.VRT_S3_PUBLIC_URL,
      sdkOptions: {
        endpoint: process.env.VRT_S3_ENDPOINT,
        region: process.env.VRT_S3_REGION,
        forcePathStyle: true,
      },
    },
  },
}

await writeFile(
  ".regconfig.json",
  `${JSON.stringify(config, null, 2)}\n`,
)
