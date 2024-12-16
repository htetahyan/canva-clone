import { InferResponseType } from "hono";
import { useInfiniteQuery } from "@tanstack/react-query";
import { client } from "@/lib/hono";

// Correct the type inference to match the new API endpoint
export type ResponseType = InferResponseType<typeof client.api.codes["$get"], 200>;

export const useListCodes = () => {
  const query = useInfiniteQuery<ResponseType, Error>({
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    queryKey: ["codes"],  // Corrected the query key to match the new endpoint
    queryFn: async ({ pageParam }) => {
      const response = await client.api.codes.$get({
        query: {
          page: (pageParam as number).toString(),
          limit: "5",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch codes");
      }

      // Ensure the response matches the expected format for pagination
      const data = await response.json();
      return { data: data.data, nextPage: data.nextPage };
    },
  });

  return query;
};
