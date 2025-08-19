import React from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import ProtectedRoute from "../../components/ProtectedRoute";
import LandigPage from "../LandingPage/LandingPage";
import Layout from "../Layout/Layout"
import TemplateConfiguration from "../TemplateConfiguration/TemplateConfiguration";
import EditorPage from "../EditorPage/EditorPage";
import DashboardPage from "../Dashboard/Dashboard";
export default function Routespage() {
  return (
    <div>
      <ToastContainer />

      <Routes>
        <Route path="/" element={<LandigPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout />}>
            <Route path="documents" element={<DashboardPage />} />
            <Route index element={<DashboardPage />} />
            <Route
              path="templateconfiguration"
              element={<TemplateConfiguration />}
            />
            <Route path="editor" element={<EditorPage />} />
          </Route>
        </Route>
      </Routes>
    </div>
  );
}
