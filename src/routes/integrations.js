import { Router } from "express";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);

// This endpoint reports verified configuration only. It does not simulate provider connectivity.
r.get("/status", (_req, res) => {
  res.json({
    provider: "urbanpiper",
    providerName: "UrbanPiper",
    state: "not_connected",
    live: false,
    capabilities: {
      zomato: "awaiting_provider_onboarding",
      swiggy: "awaiting_provider_onboarding"
    },
    message: "No UrbanPiper POS-partner credentials or approved webhook configuration have been supplied. Orders are not being imported from Zomato or Swiggy."
  });
});

export default r;
