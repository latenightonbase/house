import CreateAuction from "@/components/CreateAuction";
import PageLayout from "@/components/UI/PageLayout";

export default function CreatePage() {
    return (
        <PageLayout className="min-h-screen">
            <h1 className="text-xl font-bold text-primary">Create Auction Page</h1>
            <CreateAuction/>
        </PageLayout>
    );
}