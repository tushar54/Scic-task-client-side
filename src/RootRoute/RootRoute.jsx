import { createBrowserRouter } from "react-router-dom";
import Home from "../AllRoute/Home";
import GoogleLogin from "../Authentication/Login";
import Task from "../AllRoute/Task";
import PrivateRoute from "../PrivateRoute/PrivateRoute";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Home></Home>,
        children:[
            {
                path:'login',
                element:<GoogleLogin></GoogleLogin>
            },
            {
                path:'/task',
                element:<PrivateRoute><Task></Task></PrivateRoute>
            }
        ]
    },
]);