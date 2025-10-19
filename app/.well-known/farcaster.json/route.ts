import { NextRequest, NextResponse } from 'next/server';

export async function GET(req:NextRequest){
    try{
        return NextResponse.json({"frame":{"name":"House","tags":["utility","advertising","auctions"],"homeUrl":"https://house-peach-one.vercel.app","iconUrl":"https://house-peach-one.vercel.app/pfp.jpg","version":"1","imageUrl":"https://house-peach-one.vercel.app/pfp.jpg","subtitle":"Your House Their Bids","webhookUrl":"https://house-peach-one.vercel.app/api/webhook","buttonTitle":"Bid Today","description":"The Exchange for Attention Lives Here. Powered by LNOB","splashImageUrl":"https://house-peach-one.vercel.app/pfp.jpg","primaryCategory":"utility","splashBackgroundColor":"#000000"},"accountAssociation": {"header": "eyJmaWQiOjExMjk4NDIsInR5cGUiOiJhdXRoIiwia2V5IjoiMHgwNGI5MDE2NTA5MGM3ZTZGNDc5OGUxRDdFNzZkMjE0RmQzMUQzMjYyIn0","payload": "eyJkb21haW4iOiJob3VzZS1wZWFjaC1vbmUudmVyY2VsLmFwcCJ9","signature": "MQ8dahAbh3dVklXBU3/RQzxcfAvFG/TkJr773U8ZvPV6VoLnrbm1eFQF9K+CoY3T+TN9KTzDPiuho7AsLcOmBBs="}}, {status:200})
    }
    catch(err){
        return NextResponse.json({ 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to fetch running auctions'
      }, 
      { status: 500 })
    }
}