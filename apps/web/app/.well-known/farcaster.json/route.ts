export async function GET(){
    try{
        const response = await fetch('https://api.farcaster.xyz/miniapps/hosted-manifest/019a0f97-65c4-162f-d55f-34727e111e82');
        const data = await response.json();
        
        // Add baseBuilder field
        const result = {
            ...data,
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