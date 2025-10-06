import CreateAuction from "@/components/CreateAuction";
import PageLayout from "@/components/UI/PageLayout";

export default function CreatePage() {
    return (
        <PageLayout className="min-h-screen">
            <h1 className="text-2xl font-bold text-primary">Start an Auction!</h1>
            <p className="text-secondary text-sm mt-4">Fill out these fields and start receiving bids in your Base coin of choice.</p>
            <CreateAuction/>
        </PageLayout>
    );
}