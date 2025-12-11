import CreateAuction from "@/components/CreateAuction";
import PageLayout from "@/components/UI/PageLayout";

export default function CreatePage() {
    return (
        <PageLayout className="">
            <h1 className="text-2xl font-bold gradient-text">Start an Auction!</h1>
            <p className="text-caption text-sm mt-4">Fill out these fields and start receiving bids in your Base coin of choice.</p>
            <CreateAuction/>
        </PageLayout>
    );
}