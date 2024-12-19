import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";
//@ts-ignore
type ResponseType = InferResponseType<typeof client.api.codes[":id"]["$post"], 200>;

export const useCheckout = () => {
  const mutation = useMutation<ResponseType, Error, string>({
    mutationFn: async (id: string) => {
      //@ts-ignore
      const response = await client.api.projects[":id"].$post({
        param: {
          id,
        },
      });
      console.log(response);
      if (!response.ok) {
        const {error} = await response.json() as any;
        throw new Error(error??"code not found or limit reached");
      }

      return response.json(); // Ensure proper typing here
    },
    onSuccess: (data) => {
  
       toast.success("Code created successfully!. Limit is "+data.data.totalTemplates+" templates"+" and remaining "+data.data.usedTemplates+" templates");
      
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return mutation;
};
