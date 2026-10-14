// A deployment example. Keep SITE_URL and all tokens in Worker configuration,
// never in this repository.
export default {
  async scheduled(_event, env) {
    for (const name of ["SITE_URL", "SITE_BYPASS_TOKEN", "CRON_SECRET", "RESEND_API_KEY"]) {
      if (!env[name]) throw new Error(`Missing Worker variable: ${name}`);
    }

    const response = await fetch(new URL("/api/cron/check", env.SITE_URL), {
      method: "POST",
      headers: {
        "OAI-Sites-Authorization": `Bearer ${env.SITE_BYPASS_TOKEN}`,
        Authorization: `Bearer ${env.CRON_SECRET}`,
        "X-Resend-API-Key": env.RESEND_API_KEY,
      },
    });
    if (!response.ok) throw new Error(`ITS check returned HTTP ${response.status}`);

    const result = await response.json();
    if (!Number.isInteger(result.checkedCount) || !Number.isInteger(result.errorCount)) {
      throw new Error("ITS check returned an unexpected response");
    }
    if (result.errorCount > 0) {
      throw new Error(`ITS check failed for ${result.errorCount} of ${result.checkedCount} watches`);
    }
    console.log(JSON.stringify(result));
  },
};
