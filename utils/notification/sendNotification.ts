export async function sendNotification(url:string, token:string, notificationTitle:string, notificationBody:string, targetUrl:string) {
    try{
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title: notificationTitle,
        body: notificationBody,
        targetUrl: targetUrl,
        tokens: [token],
      }),
    });

    if(res.ok){
        return { ok: true, status: res.status};
    }

    return { ok: false, status: res.status, error: await res.json() };

    }
    catch(err){
        console.error("Error sending notification:", err);
        return { ok: false, status: 500, error: 'Internal server error' };
    }
}