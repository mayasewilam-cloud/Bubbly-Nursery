declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUBBLY_LOCAL_PREVIEW?: string;
    BUBBLY_OWNER_EMAIL?: string;
    BUCKET?: R2Bucket;
  }
}
