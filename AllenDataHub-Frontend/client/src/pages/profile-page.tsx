import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import ProfileView from "@/components/profile/ProfileView";

export default function ProfilePage() {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <ProfileView user={user} />;
}
