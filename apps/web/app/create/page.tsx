import { Suspense } from "react";
import CreateAuction from "@/components/CreateAuction";
import PageLayout from "@/components/UI/PageLayout";
import Heading from "@/components/UI/Heading";

export default function CreatePage() {
    return (
        <PageLayout className="">
            <div className="text-center mb-6">
                <Heading size="lg">Create New Auction</Heading>
                <p className="text-caption text-sm mt-2">List your digital assets for auction</p>
            </div>
            <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
                <CreateAuction/>
            </Suspense>
        </PageLayout>
    );
}