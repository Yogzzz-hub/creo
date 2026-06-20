import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export type DeliverableType = "poster" | "reel" | "story"
export type DeliverableStatus = "pending" | "approved" | "revision" | "rejected"

export interface Deliverable {
  id: string
  title: string
  type: DeliverableType
  status: DeliverableStatus
  uploadDate: string
  thumbnail: string | null
}

const MOCK_DELIVERABLES: Deliverable[] = [
  {
    id: "1",
    title: "Summer Fitness Tips Reel",
    type: "reel",
    status: "pending",
    uploadDate: "2026-06-15",
    thumbnail: null,
  },
  {
    id: "2",
    title: "Gym Membership Promo Poster",
    type: "poster",
    status: "approved",
    uploadDate: "2026-06-14",
    thumbnail: null,
  },
  {
    id: "3",
    title: "Workout Motivation Story",
    type: "story",
    status: "revision",
    uploadDate: "2026-06-13",
    thumbnail: null,
  },
  {
    id: "4",
    title: "Personal Training Ad Poster",
    type: "poster",
    status: "rejected",
    uploadDate: "2026-06-12",
    thumbnail: null,
  },
  {
    id: "5",
    title: "Client Transformation Reel",
    type: "reel",
    status: "approved",
    uploadDate: "2026-06-11",
    thumbnail: null,
  },
  {
    id: "6",
    title: "Morning Routine Story",
    type: "story",
    status: "pending",
    uploadDate: "2026-06-10",
    thumbnail: null,
  },
]

const DELIVERABLES_QUERY_KEY = ["deliverables"]

function fetchDeliverables(): Promise<Deliverable[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...MOCK_DELIVERABLES])
    }, 300)
  })
}

function approveDeliverableRequest(id: string): Promise<{ id: string; status: "approved" }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!id) {
        reject(new Error("Invalid deliverable ID"))
        return
      }
      resolve({ id, status: "approved" })
    }, 800)
  })
}

export function useDeliverables() {
  return useQuery({
    queryKey: DELIVERABLES_QUERY_KEY,
    queryFn: fetchDeliverables,
  })
}

export function useApproveDeliverable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => approveDeliverableRequest(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: DELIVERABLES_QUERY_KEY })

      const previousDeliverables = queryClient.getQueryData<Deliverable[]>(
        DELIVERABLES_QUERY_KEY
      )

      queryClient.setQueryData<Deliverable[]>(
        DELIVERABLES_QUERY_KEY,
        (old) =>
          old?.map((d) =>
            d.id === id ? { ...d, status: "approved" as const } : d
          ) ?? []
      )

      return { previousDeliverables }
    },

    onError: (_err, _id, context) => {
      if (context?.previousDeliverables) {
        queryClient.setQueryData(
          DELIVERABLES_QUERY_KEY,
          context.previousDeliverables
        )
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DELIVERABLES_QUERY_KEY })
    },
  })
}
