import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useAuth } from "../Authentication/AuthProvider";
import io from "socket.io-client";
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

// Fetch tasks from the server
const fetchTasks = async () => {
  const res = await axios.get("http://localhost:5000/Alltask");
  return res.data;
};

// Create a socket connection (adjust the URL as needed)
const socket = io("http://localhost:5000");

// Draggable task component using dnd-kit's useDraggable hook
const DraggableTask = ({ task }) => {
  // Use string version of MongoDB _id
  const draggableId = String(task._id);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: draggableId,
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    cursor: "grab",
    padding: "0.5rem",
    marginBottom: "0.25rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "#fff",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {task.title}
    </div>
  );
};

// Droppable column component using dnd-kit's useDroppable hook
const DroppableColumn = ({ category, tasks }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: category,
  });

  const style = {
    border: "2px dashed #ccc",
    backgroundColor: isOver ? "#d3f9d8" : "#fafafa",
    minHeight: "80vh",
    padding: "0.5rem",
  };

  return (
    <div ref={setNodeRef} id={category} style={style}>
      <h1 className="text-center border-b-2 mb-2">{category}</h1>
      {tasks.map((task) => (
        <DraggableTask key={String(task._id)} task={task} />
      ))}
    </div>
  );
};

const Task = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  // Fetch tasks using React Query
  const { data: tasks = [], refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  // Listen for websocket events to update tasks in real time
  useEffect(() => {
    socket.on("tasksUpdated", () => {
      refetch();
    });
    return () => {
      socket.off("tasksUpdated");
    };
  }, [refetch]);

  // Function to add a new task
  const onSubmit = async (data) => {
    try {
      const taskData = {
        email: user?.email,
        title: data.title,
        description: data.description || "",
        timestamp: new Date().toISOString(),
        category: "To-Do", // Default category
      };
      await axios.post("http://localhost:5000/task", taskData);
      setIsModalOpen(false);
      reset();
      refetch();
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  // Handle drag end event: update task category when dropped in a new column
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return; // If dropped outside a droppable area, do nothing

    const newCategory = over.id;
    // Find the task using the string id
    const task = tasks.find((t) => String(t._id) === active.id);
    if (!task || task.category === newCategory) return;

    try {
      await axios.put(`http://localhost:5000/tasks/${active.id}`, {
        category: newCategory,
      });
      // The backend emits "tasksUpdated" so refetch will update the UI.
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Group tasks by category for display
  const categories = ["To-Do", "In Progress", "Done"];
  const tasksByCategory = categories.reduce((acc, category) => {
    acc[category] = tasks.filter((task) => task.category === category);
    return acc;
  }, {});

  return (
    <div className="container mx-auto grid grid-cols-12 justify-center items-start">
      {/* Add Task Button & Modal */}
      <div className="ml-5 col-span-3">
        <button className="btn" onClick={() => setIsModalOpen(true)}>
          <FaPlus />
        </button>
        {isModalOpen && (
          <div className="absolute bg-white shadow-lg p-4 mt-2 w-80 border rounded-md">
            <h2 className="text-lg font-bold mb-2">Add Task</h2>
            <form onSubmit={handleSubmit(onSubmit)}>
              <input
                type="text"
                placeholder="Title"
                {...register("title", { required: true, maxLength: 50 })}
                className="border p-2 w-full mb-2"
              />
              <textarea
                placeholder="Description (Optional)"
                {...register("description", { maxLength: 200 })}
                className="border p-2 w-full mb-2"
              />
              <div className="flex justify-between">
                <button
                  type="button"
                  className="btn bg-gray-300"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn bg-blue-500 text-white">
                  Add
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Task Columns with DnD Context */}
      <div className="col-span-9">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-3 gap-4">
            {categories.map((category) => (
              <DroppableColumn
                key={category}
                category={category}
                tasks={tasksByCategory[category] || []}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
};

export default Task;
