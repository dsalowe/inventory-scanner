export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const FROM_EMAIL = process.env.FROM_EMAIL || 'Inventory Scanner <onboarding@resend.dev>'

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500 })
  }

  try {
    const { studentName, studentEmail, items, checkedOutBy } = await req.json()

    if (!studentEmail || !items?.length) {
      return new Response(JSON.stringify({ error: 'Missing studentEmail or items' }), { status: 400 })
    }

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const itemRows = items.map(item =>
      `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#1f2937;">${item.name}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;font-family:monospace;">${item.sku}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;text-align:center;">${item.quantity || 1}</td>
      </tr>`
    ).join('')

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:24px;">
        <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background:#7c3aed;padding:28px 24px;text-align:center;">
            <h1 style="margin:0;color:white;font-size:22px;font-weight:700;">Equipment Checkout Receipt</h1>
            <p style="margin:8px 0 0;color:#ddd6fe;font-size:14px;">${date}</p>
          </div>

          <!-- Body -->
          <div style="padding:24px;">
            <p style="margin:0 0 4px;font-size:15px;color:#374151;">Hi <strong>${studentName}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">The following items have been checked out to you:</p>

            <!-- Items table -->
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Item</th>
                  <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">SKU</th>
                  <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Qty</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
              Total items: <strong style="color:#374151;">${items.length}</strong>
            </p>

            <div style="margin:24px 0 0;padding:16px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;">
              <p style="margin:0;font-size:13px;color:#7c3aed;">
                <strong>Please return all items on time.</strong> Contact your instructor if you have any questions.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              ${checkedOutBy ? `Checked out by ${checkedOutBy} · ` : ''}Inventory Scanner
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: studentEmail,
        subject: `Equipment Checkout Receipt — ${date}`,
        html
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Failed to send email' }), {
        status: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }
}

export const config = { path: '/api/send-email' }
