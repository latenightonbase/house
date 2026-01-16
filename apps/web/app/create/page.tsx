import { Suspense } from "react";
import CreateAuction from "@/components/CreateAuction";
import PageLayout from "@/components/UI/PageLayout";
import Heading from "@/components/UI/Heading";

export default function CreatePage() {
    return (
        <PageLayout className="">
            <Heading size="lg">Start an Auction!</Heading>
            <p className="text-caption text-sm mt-4">Fill out these fields and start receiving bids in your Base coin of choice.</p>
            <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
                <CreateAuction/>
            </Suspense>
        </PageLayout>
    );
}