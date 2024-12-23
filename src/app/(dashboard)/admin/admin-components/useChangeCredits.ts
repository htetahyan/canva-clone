import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";


type ResponseType = InferResponseType<(typeof client.api.users.credits[":id"])["$patch"], 200>;
type RequestType = {
  id: string; // User ID
  credits: number; // Credits value
};

export const useUpdateCredits = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ id, credits }) => {
      const response = await client.api.users.credits[":id"].$patch({
        param: { id },
        json: { credits },
      });

      if (!response.ok) {
        const errorResponse = (await response.json()) as any;
        throw new Error(errorResponse.error || "Something went wrong");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Credits updated successfully.");


      // Invalidate queries related to credits or users
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
    onError: (error) => {
      toast.error(
        error.message ||
          "Failed to update credits. Please check your session or try again later."
      );
    },
  });

  return mutation;
};
