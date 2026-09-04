// Provider-neutral KYC boundary. Provider secrets and webhook verification must
// stay server-side; the browser only submits a request for authorized review.
export const KYCProvider = {
  name: 'manual_review',
  configured: false,
  async createVerificationSession() {
    throw new Error('Automated KYC provider is not configured. Manual review remains available.');
  },
  async submitVerification() {
    throw new Error('Automated KYC provider is not configured.');
  },
  async getVerificationStatus() {
    throw new Error('Automated KYC provider is not configured.');
  },
  async handleWebhook() {
    throw new Error('KYC webhooks must be handled by a trusted server endpoint.');
  },
  async getVerificationResult() {
    throw new Error('Automated KYC provider is not configured.');
  },
};
