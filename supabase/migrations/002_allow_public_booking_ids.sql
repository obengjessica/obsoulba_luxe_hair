grant insert (id, name, phone, service_id, appointment_date, preferred_time, notes)
  on public.bookings to anon, authenticated;
