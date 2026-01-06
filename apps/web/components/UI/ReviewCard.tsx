import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { RiStarFill } from "react-icons/ri";

interface ReviewCardProps {
  rating: number;
  comment?: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPfp?: string | null;
  auctionName: string;
  createdAt: string;
}

export default function ReviewCard({
  rating,
  comment,
  reviewerId,
  reviewerName,
  reviewerPfp,
  auctionName,
  createdAt,
}: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const navigate = useNavigateWithLoader()

  return (
    <div className="bg-white/10 rounded-lg p-2 border border-white/10 hover:bg-white/15 transition-all duration-200">
      <div className="flex items-start gap-2 mb-3">
        {reviewerPfp && (
          <img
            src={reviewerPfp}
            alt={reviewerName}
            className="w-6 h-6 rounded-full border-2 border-primary/30"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p onClick={()=>{
              navigate(`/user/${reviewerId}`)
            }} className="font-semibold text-white truncate gradient-text">{reviewerName}</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <RiStarFill
                  key={i}
                  className={`text-sm ${
                    i < rating ? "text-yellow-400" : "text-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-caption mb-1 ">
            {auctionName}
          </p>
          
        </div>
      </div>
      {comment && (
        <p className="text-sm text-white/80 mt-2 line-clamp-3">{comment}</p>
      )}

      <p className="text-xs text-caption text-right w-full">{formatDate(createdAt)}</p>
    </div>
  );
}
