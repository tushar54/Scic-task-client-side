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
  useDroppable,
} from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Fetch tasks from the server
const fetchTasks = async () => {
  const res = await axios.get("https://scic-task-server-side.onrender.com/Alltask");
  return res.data;
};

// Create a socket connection (adjust the URL as needed)
const socket = io("http://localhost:5000");

// Sortable Draggable Task Component
const DraggableTask = ({ task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: String(task._id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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

// Droppable Column with Sortable Context
const DroppableColumn = ({ category, tasks }) => {
  // The droppable's id is set as the category name.
  const { setNodeRef, isOver } = useDroppable({ id: category });
  const style = {
    border: "2px dashed #ccc",
    backgroundColor: isOver ? "#d3f9d8" : "#fafafa",
    minHeight: "80vh",
    padding: "0.5rem",
  };

  return (
    <div ref={setNodeRef} id={category} style={style}>
      <h1 className="text-center border-b-2 mb-2">{category}</h1>
      <SortableContext items={tasks.map((task) => String(task._id))}>
        {tasks.map((task) => (
          <DraggableTask key={String(task._id)} task={task} />
        ))}
      </SortableContext>
    </div>
  );
};

const Task = () => {
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
      await axios.post("https://scic-task-server-side.onrender.com/task", taskData);
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
      await axios.put(`https://scic-task-server-side.onrender.com/tasks/${selectedTask._id}`, {
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
    resetEditForm({
      title: task.title,
      description: task.description,
      category: task.category,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (taskId) => {
    try {
      await axios.delete(`https://scic-task-server-side.onrender.com/delete/${taskId}`);
      alert("Successfully deleted");
      refetch();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Group tasks by category for display and sorting.
  const categories = ["To-Do", "In Progress", "Done"];
  const tasksByCategory = categories.reduce((acc, category) => {
    acc[category] = tasks
      .filter((task) => task.category === category)
      .sort((a, b) => a.order - b.order); // Assumes tasks have an 'order' field
    return acc;
  }, {});

  // Revised drag-end handler
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    // active.id is always a task id (a stringified _id)
    const activeId = String(active.id);
    const activeTask = tasks.find((t) => String(t._id) === activeId);
    if (!activeTask) return;

    // If the drop target's id exists among the tasks in activeTask's category,
    // then it is a reorder operation.
    const currentCategoryTasks = tasksByCategory[activeTask.category] || [];
    const currentTaskIds = currentCategoryTasks.map((t) => String(t._id));

    if (currentTaskIds.includes(String(over.id))) {
      // Reordering within the same category.
      const oldIndex = currentCategoryTasks.findIndex(
        (t) => String(t._id) === activeId
      );
      const newIndex = currentCategoryTasks.findIndex(
        (t) => String(t._id) === String(over.id)
      );
      if (oldIndex === newIndex) return;

      const newOrder = arrayMove(currentCategoryTasks, oldIndex, newIndex);
      try {
        await axios.put("https://scic-task-server-side.onrender.com/reorder", {
          category: activeTask.category,
          tasks: newOrder.map((task, index) => ({
            _id: task._id,
            order: index,
          })),
        });
        refetch();
      } catch (error) {
        console.error("Error reordering tasks:", error);
      }
    } else {
      // Otherwise, treat it as a category change.
      // Here, over.id should be the droppable container's id (i.e. the category name).
      const newCategory = over.id;
      if (newCategory !== activeTask.category) {
        try {
          await axios.put(`https://scic-task-server-side.onrender.com/tasks/${activeId}`, {
            category: newCategory,
          });
          refetch();
        } catch (error) {
          console.error("Error updating task category:", error);
        }
      }
    }
  };

  return (
    <div className="container mx-auto md:flex  justify-center items-start gap-2">
      {/* Left Column: Add Task Button, Modal, and Task List */}
      <div className="ml-5 md:w-3/12">
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

        {/* Task List with Edit and Delete Options */}
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

      {/* Right Column: Task Columns with DnD Context */}
      <div className="w-9/12">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid md:grid-cols-3 gap-4">
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
