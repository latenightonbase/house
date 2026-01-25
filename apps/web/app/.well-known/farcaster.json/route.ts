export async function GET(){
    try{
        const manifestLink = process.env.NEXT_PUBLIC_FARCASTER_MANIFEST_LINK;

        if(!manifestLink){
            return new Response("Farcaster manifest link not configured", { status: 404 });
        }

        const response = await fetch(manifestLink);
        const data = await response.json();
        
        // Add baseBuilder field
        const result = {
            ...data,
            
  accountAssociation: {
    header: "eyJmaWQiOjY2NjAzOCwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDc1NURjNjUzMzNDMTZGMzg4ZDIwNTQ1MTNCOUQwMTNENzAzNUYyMzAifQ",
    payload: "eyJkb21haW4iOiJob3VzZXByb3RvLmZ1biJ9",
    signature: "PXFFc/S7DcAeAx6DavVpX4UzGkBGe1BLAGtl4IntkKg8MRL64QYbVr7H0xeGiZ/U1zTe2jX6/dcmfrVVci9EKxw="
  },

            baseBuilder: {
                ownerAddress: "0x96127abba054403920090c65d54e5dcfb8360aa9"
            }
        };
        
        return Response.json(result);
    }
    catch(error){
        return new Response("Error fetching Farcaster config", { status: 500 });
    }
}