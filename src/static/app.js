document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Escape HTML to avoid injection when rendering participant strings
  function escapeHtml(unsafe) {
    return String(unsafe).replace(/[&<>"']/g, (m) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m];
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset select options (avoid duplicates)
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML
        const participants = details.participants || [];
        let participantsHtml = "";
        if (participants.length > 0) {
          participantsHtml = '<div class="participants"><h5>Participants</h5><ul class="participants-list">';
          participants.forEach((p) => {
            participantsHtml += `<li><span class="participant-email">${escapeHtml(p)}</span><button type="button" class="participant-remove" data-activity-enc="${encodeURIComponent(name)}" data-email-enc="${encodeURIComponent(p)}" aria-label="Remove ${escapeHtml(p)}" title="Remove ${escapeHtml(p)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 6h18v2H3V6zm2 3h14l-1 11H6L5 9zm5-5h4l1 1h-6l1-1z"/></svg></button></li>`;
          });
          participantsHtml += '</ul></div>';
        } else {
          participantsHtml = `<p class="no-participants">No participants yet</p>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const submitButton = signupForm.querySelector('button[type="submit"]');

    try {
      if (submitButton) submitButton.disabled = true;

      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  // Simple promise-based modal confirmation helper
  function confirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById("confirm-overlay");
      const msg = document.getElementById("confirm-message");
      const ok = document.getElementById("confirm-ok");
      const cancel = document.getElementById("confirm-cancel");

      msg.textContent = message;
      overlay.classList.remove("hidden");

      function cleanup() {
        overlay.classList.add("hidden");
        ok.removeEventListener("click", onOk);
        cancel.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKey);
      }

      function onOk() {
        cleanup();
        resolve(true);
      }

      function onCancel() {
        cleanup();
        resolve(false);
      }

      function onKey(e) {
        if (e.key === "Escape") {
          onCancel();
        }
      }

      ok.addEventListener("click", onOk);
      cancel.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKey);

      // focus management
      ok.focus();
    });
  }

  // Delegate click handler for removing participants
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".participant-remove");
    if (!btn) return;
    const activityEnc = btn.dataset.activityEnc;
    const emailEnc = btn.dataset.emailEnc;

    // Use custom modal confirmation
    const emailDisplay = decodeURIComponent(emailEnc);
    const activityDisplay = decodeURIComponent(activityEnc);
    const confirmed = await confirmDialog(`Remove ${emailDisplay} from ${activityDisplay}?`);
    if (!confirmed) return;

    try {
      btn.disabled = true;
      const resp = await fetch(`/activities/${activityEnc}/participants?email=${emailEnc}`, { method: "DELETE" });
      const res = await resp.json();
      if (resp.ok) {
        messageDiv.textContent = res.message;
        messageDiv.className = "success";
        // Refresh activities to reflect change
        fetchActivities();
      } else {
        messageDiv.textContent = res.detail || "Failed to remove participant";
        messageDiv.className = "error";
      }
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error removing participant:", error);
    } finally {
      btn.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();
});
