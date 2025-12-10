// src/app/tasks/new/page.tsx
import TaskForm from "@/components/tasks/TaskForm";

type PageProps = {
  searchParams: Promise<{ propertyId?: string }>; // ✅ Next 16: Promise
};

export default async function NewTaskPage({ searchParams }: PageProps) {
  // ✅ Unwrap the searchParams Promise
  const sp = await searchParams;

  const propertyIdParam = sp?.propertyId;
  const propertyId =
    propertyIdParam && !Number.isNaN(Number(propertyIdParam))
      ? Number(propertyIdParam)
      : null;

  console.log("[NewTaskPage] propertyId from searchParams:", propertyId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <TaskForm
        mode="create"
        taskId={undefined}
        initialValues={null}
        propertyId={propertyId} // ✅ pass it into the form
      />
    </div>
  );
}
