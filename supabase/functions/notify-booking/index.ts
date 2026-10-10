import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  let payload: { bookingId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "A valid JSON request body is required." }, 400);
  }

  const bookingId = typeof payload.bookingId === "string" ? payload.bookingId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
    return jsonResponse({ error: "A valid booking ID is required." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("FROM_EMAIL");
  const notificationEmail = Deno.env.get("NOTIFICATION_EMAIL") ?? "Otengchristiana4837@gmail.com";
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !fromEmail) {
    console.error("Booking email notification is missing required Supabase or Resend secrets.");
    return jsonResponse({ error: "Email notification is not configured." }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, name, phone, service_name, appointment_date, preferred_time, notes")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error("Could not load booking for email notification:", bookingError.message);
    return jsonResponse({ error: "Could not load the booking for notification." }, 500);
  }
  if (!booking) return jsonResponse({ error: "Booking not found." }, 404);

  const rows = [
    ["Name", booking.name],
    ["Phone", booking.phone],
    ["Service", booking.service_name],
    ["Preferred date", booking.appointment_date],
    ["Preferred time", booking.preferred_time],
    ["Notes", booking.notes || "None"],
  ];
  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const html = `<h2>New Obsoulba Luxe Hair appointment request</h2><table>${rows
    .map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("")}</table>`;

  let emailResponse: Response;
  try {
    emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `booking-${booking.id}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notificationEmail],
        subject: `New appointment request — ${booking.name}`,
        text,
        html,
      }),
    });
  } catch (error) {
    console.error("Could not reach Resend for booking notification:", error);
    return jsonResponse({ error: "Could not reach the email provider." }, 502);
  }

  if (!emailResponse.ok) {
    const providerMessage = await emailResponse.text();
    console.error("Resend rejected booking notification:", emailResponse.status, providerMessage);
    return jsonResponse({ error: "The email provider could not send the notification." }, 502);
  }

  return jsonResponse({ sent: true });
});
