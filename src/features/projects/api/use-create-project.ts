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
        const errorResponse = (await response.json()) as any;
        throw new Error(errorResponse.error || "Something went wrong");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Project created.");

      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      toast.error(
        error.message ||
          "Failed to create project. The session token may have expired, logout and login again, and everything will work fine."
      );
    },
  });

  return mutation;
};

export const useChangeName = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, { id: string; name: string }>({
    mutationFn: async ({ id, name }) => {
      const response = await client.api.projects[":id"].name.$patch({
        param: { id },
        json: { name },
      });

      if (!response.ok) {
        const errorResponse = (await response.json()) as any;
        throw new Error(errorResponse.error || "Something went wrong");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Project name updated.");

      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      toast.error(
        error.message ||
          "Failed to update project name. The session token may have expired, logout and login again, and everything will work fine."
      );
    },
  });

  return mutation;
};
