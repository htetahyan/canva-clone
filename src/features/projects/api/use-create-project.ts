import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<(typeof client.api.projects)["$post"], 200>;
type RequestType = InferRequestType<(typeof client.api.projects)["$post"]>["json"];

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.projects.$post({ json });

      if (!response.ok) {
        // Parse the error response to extract the message
        const errorResponse = await response.json() as any;
        throw new Error(errorResponse.error || "Something went wrong");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Project created.");

      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      // Display the error message from the API response
      toast.error(
        error.message ||
          "Failed to create project. The session token may have expired, logout and login again, and everything will work fine."
      );
    },
  });

  return mutation;
};
