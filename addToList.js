// addToDL-oauth.js
// Node.js script: EWS SOAP + OAuth2 (client-credentials) with enhanced logging

const { ClientSecretCredential } = require('@azure/identity');
const fetch = require('node-fetch');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const tenantId     = 'fc8e8490-3696-4d94-8c1f-2ef26dbfd172';
const clientId     = '55074c04-b74e-4d4b-b699-b9c68b81b5f1';
const clientSecret = '4iz8Q~gkh4uuX1cnbh5mo7UiFvrpNetn4sYZvb-4';

const DL_ADDRESS     = 'all-bjp@ptbjp.onmicrosoft.com';
const MEMBER_ADDRESS = 'agam.wiliam@ptbjp.onmicrosoft.com';
const EWS_URL        = 'https://outlook.office365.com/EWS/Exchange.asmx';
const SOAP_ACTION    = 'http://schemas.microsoft.com/exchange/services/2006/messages/AddDistributionGroupMember';

// ── STEP [1]: Acquire OAuth2 Token ─────────────────────────────────────────────
async function getEwsToken() {
  console.log('[1] ▶ Acquiring OAuth2 token for EWS...');
  const cred = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const scope = 'https://outlook.office365.com/.default';
  const tokenResponse = await cred.getToken(scope);
  if (!tokenResponse || !tokenResponse.token) {
    throw new Error('Token acquisition failed');
  }
  console.log('[1] ✓ Token acquired:', tokenResponse.token.slice(0, 20) + '…');
  return tokenResponse.token;
}

// ── STEP [2]: Build SOAP Envelope ───────────────────────────────────────────────
function buildEnvelope(dl, member) {
  console.log('[2] ▶ Building SOAP envelope...');
  const env = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2016" />
  </soap:Header>
  <soap:Body>
    <AddDistributionGroupMember
      xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
      <GroupIdentity>
        <t:SMTPAddress>${dl}</t:SMTPAddress>
      </GroupIdentity>
      <Members>
        <t:Mailbox>
          <t:EmailAddress>${member}</t:EmailAddress>
        </t:Mailbox>
      </Members>
    </AddDistributionGroupMember>
  </soap:Body>
</soap:Envelope>`;
  console.log('[2] ✓ Envelope built (length:', env.length, 'chars)');
  return env;
}

// ── STEP [3]: Send SOAP Request ────────────────────────────────────────────────
async function sendSoapRequest(token, envelope) {
  console.log('[3] ▶ Preparing HTTP request to EWS...');
  const headers = {
    // SOAP 1.1 Content-Type with action parameter
    'Content-Type': `text/xml; charset=utf-8; action="${SOAP_ACTION}"`,
    // SOAPAction must be in quotes
    'SOAPAction': `"${SOAP_ACTION}"`,
    'Authorization': `Bearer ${token}`
  };
  console.log('[3] • URL:', EWS_URL);
  console.log('[3] • Content-Type:', headers['Content-Type']);
  console.log('[3] • SOAPAction:', headers['SOAPAction']);
  console.log('[3] • Authorization:', `Bearer ${token.slice(0,20)}…`);
  console.log('[3] ▶ Sending request...');
  
  const res = await fetch(EWS_URL, {
    method: 'POST',
    headers,
    body: envelope
  });
  console.log(`[3] ✓ HTTP ${res.status} ${res.statusText}`);
  return res;
}

// ── STEP [4]: Read & Log Response ─────────────────────────────────────────────
async function handleResponse(res) {
  console.log('[4] ▶ Reading response body...');
  const body = await res.text();
  console.log('[4] • Body length:', body.length, 'chars');
  
  if (!res.ok) {
    console.error('[4]! HTTP-level error, dump response:\n', body);
    process.exit(1);
  }
  if (body.includes('<soap:Fault>')) {
    console.error('[4]! SOAP Fault detected:\n', body);
    process.exit(1);
  }
  
  console.log('[4] ✓ Distribution-list member added successfully');
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const token    = await getEwsToken();
    const envelope = buildEnvelope(DL_ADDRESS, MEMBER_ADDRESS);
    const res      = await sendSoapRequest(token, envelope);
    await handleResponse(res);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();
