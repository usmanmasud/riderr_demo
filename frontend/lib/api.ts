const API = process.env.NEXT_PUBLIC_API_URL;

export async function fetchDeliveries() {
  const res = await fetch(`${API}/deliveries`);
  return res.json();
}

export async function createDelivery(data: object) {
  const res = await fetch(`${API}/deliveries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function assignRider(deliveryId: number, riderId: number) {
  const res = await fetch(`${API}/deliveries/${deliveryId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ riderId }),
  });
  return res.json();
}

export async function fetchRiders() {
  const res = await fetch(`${API}/riders`);
  return res.json();
}

export async function createRider(data: object) {
  const res = await fetch(`${API}/riders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API}/deliveries/analytics`);
  return res.json();
}
