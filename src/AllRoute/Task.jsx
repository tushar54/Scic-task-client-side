import { useState, useEffect } from "react";
import { FaEdit, FaPlus } from "react-icons/fa";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useAuth } from "../Authentication/AuthProvider";
import io from "socket.io-client";
import { MdOutlineCancel } from "react-icons/md";
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
    borderRadius: "5px",
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
  const { isOver, setNodeRef } = useDroppable({ id: category });
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // New states for editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // react-hook-form instances for add and edit forms
  const {
    register: addRegister,
    handleSubmit: handleAddSubmit,
    reset: resetAddForm,
  } = useForm();

  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
  } = useForm();

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
  const onAddSubmit = async (data) => {
    try {
      const taskData = {
        email: user?.email,
        title: data.title,
        description: data.description || "",
        timestamp: new Date().toISOString(),
        category: "To-Do", // Default category
      };
      await axios.post("http://localhost:5000/task", taskData);
      setIsAddModalOpen(false);
      resetAddForm();
      refetch();
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  // Function to update a task (edit)
  const onEditSubmit = async (data) => {
    try {
      await axios.put(`http://localhost:5000/tasks/${selectedTask._id}`, {
        title: data.title,
        description: data.description,
        category: data.category,
      });
      setIsEditModalOpen(false);
      setSelectedTask(null);
      resetEditForm();
      refetch();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Function to open edit modal and pre-fill with task data
  const handleEdit = (task) => {
    setSelectedTask(task);
    // Pre-fill the form with the selected task's data
    resetEditForm({
      title: task.title,
      description: task.description,
      category: task.category,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (taskId) => {
    try {
      await axios.delete(`http://localhost:5000/delete/${taskId}`);
      alert("Successfully deleted");
      refetch();
    } catch (error) {
      console.log(error);
    }
  };

  // Handle drag end event: update task category when dropped in a new column
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return; // If dropped outside a droppable area, do nothing

    const newCategory = over.id;
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
        <button className="btn" onClick={() => setIsAddModalOpen(true)}>
          <FaPlus />
        </button>

        {isAddModalOpen && (
          <div className="absolute bg-white shadow-lg p-4 mt-2 w-80 border rounded-md">
            <h2 className="text-lg font-bold mb-2">Add Task</h2>
            <form onSubmit={handleAddSubmit(onAddSubmit)}>
              <input
                type="text"
                placeholder="Title"
                {...addRegister("title", { required: true, maxLength: 50 })}
                className="border p-2 w-full mb-2"
              />
              <textarea
                placeholder="Description (Optional)"
                {...addRegister("description", { maxLength: 200 })}
                className="border p-2 w-full mb-2"
              />
              <div className="flex justify-between">
                <button
                  type="button"
                  className="btn bg-gray-300"
                  onClick={() => setIsAddModalOpen(false)}
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

        {/* List tasks with Edit and Delete options */}
        {tasks?.map((task) => (
          <div
            className="border-2 flex flex-col mt-3 p-2 rounded-sm"
            key={task._id}
          >
            <h1 className="text-xl font-bold">{task.title}</h1>
            <div className="flex justify-between items-center">
              <h1
                className={`text-xl font-bold ${
                  task.category === "To-Do"
                    ? "text-red-500"
                    : task.category === "In Progress"
                    ? "text-yellow-500"
                    : "text-green-500"
                }`}
              >
                {task.category}
              </h1>
              <div className="flex justify-center items-center gap-3">
                <button onClick={() => handleEdit(task)}>
                  <FaEdit className="text-2xl" />
                </button>
                <button onClick={() => handleDelete(task._id)}>
                  <MdOutlineCancel className="text-2xl text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Task Modal */}
      {isEditModalOpen && selectedTask && (
        <div className="absolute bg-white shadow-lg p-4 mt-2 w-80 border rounded-md">
          <h2 className="text-lg font-bold mb-2">Edit Task</h2>
          <form onSubmit={handleEditSubmit(onEditSubmit)}>
            <input
              type="text"
              placeholder="Title"
              {...editRegister("title", { required: true, maxLength: 50 })}
              className="border p-2 w-full mb-2"
            />
            <textarea
              placeholder="Description (Optional)"
              {...editRegister("description", { maxLength: 200 })}
              className="border p-2 w-full mb-2"
            />
            {/* Editable select for category */}
            <select
              {...editRegister("category", { required: true })}
              className="border p-2 w-full mb-2"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="flex justify-between">
              <button
                type="button"
                className="btn bg-gray-300"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedTask(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn bg-blue-500 text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

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
