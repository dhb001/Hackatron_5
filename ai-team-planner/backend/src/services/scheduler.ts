import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { AISubtask, SchedulingConstraints } from '../types';

dayjs.extend(utc);

export class Scheduler {
  /**
   * Reschedule tasks to avoid conflicts and respect constraints
   */
  static rescheduleTasks(
    subtasks: AISubtask[], 
    dueDate: dayjs.Dayjs, 
    constraints: SchedulingConstraints
  ): AISubtask[] {
    const { workHoursPerDay, startHour, endHour, daysOfWeek } = constraints;
    const memberSchedules: Record<string, dayjs.Dayjs> = {};
    
    // Start scheduling from tomorrow
    const startDate = dayjs().add(1, 'day');
    
    // Sort subtasks by part number, then by estimated time (longest first)
    const sortedTasks = [...subtasks].sort((a, b) => {
      if (a.part !== b.part) return a.part - b.part;
      return b.estimatedMinutes - a.estimatedMinutes;
    });

    const rescheduledTasks: AISubtask[] = [];

    for (const task of sortedTasks) {
      const memberName = task.assignee;
      let nextSlot = memberSchedules[memberName] || startDate.hour(startHour).minute(0).second(0);
      
      // Find next valid working slot
      nextSlot = this.findNextWorkingSlot(nextSlot, dueDate, constraints);
      
      if (nextSlot.isAfter(dueDate.subtract(1, 'day'))) {
        console.warn(`Task "${task.title}" scheduled after due date, may need adjustment`);
      }

      // Schedule the task
      const startTime = nextSlot;
      const endTime = startTime.add(task.estimatedMinutes, 'minute');
      
      const rescheduledTask: AISubtask = {
        ...task,
        scheduled: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        }
      };

      rescheduledTasks.push(rescheduledTask);

      // Update member's next available time with buffer
      memberSchedules[memberName] = endTime.add(15, 'minute');
    }

    return rescheduledTasks;
  }

  /**
   * Find the next available working slot for a task
   */
  private static findNextWorkingSlot(
    startTime: dayjs.Dayjs, 
    dueDate: dayjs.Dayjs, 
    constraints: SchedulingConstraints
  ): dayjs.Dayjs {
    const { startHour, endHour, daysOfWeek } = constraints;
    let slot = startTime;

    // Ensure we're within working hours
    if (slot.hour() < startHour) {
      slot = slot.hour(startHour).minute(0).second(0);
    } else if (slot.hour() >= endHour) {
      // Move to next day
      slot = slot.add(1, 'day').hour(startHour).minute(0).second(0);
    }

    // Ensure we're on a working day
    while (!daysOfWeek.includes(slot.day()) && slot.isBefore(dueDate)) {
      slot = slot.add(1, 'day').hour(startHour).minute(0).second(0);
    }

    return slot;
  }

  /**
   * Calculate total work hours available between now and due date
   */
  static calculateAvailableHours(dueDate: dayjs.Dayjs, constraints: SchedulingConstraints): number {
    const { startHour, endHour, daysOfWeek } = constraints;
    const hoursPerWorkDay = endHour - startHour;
    let totalHours = 0;
    
    let currentDate = dayjs().add(1, 'day').hour(startHour).minute(0).second(0);
    
    while (currentDate.isBefore(dueDate)) {
      if (daysOfWeek.includes(currentDate.day())) {
        totalHours += hoursPerWorkDay;
      }
      currentDate = currentDate.add(1, 'day');
    }

    return totalHours;
  }

  /**
   * Check if all tasks can be completed by due date
   */
  static validateScheduleFeasibility(
    subtasks: AISubtask[], 
    dueDate: dayjs.Dayjs, 
    constraints: SchedulingConstraints,
    memberCount: number
  ): { feasible: boolean; requiredHours: number; availableHours: number } {
    const totalMinutes = subtasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
    const requiredHours = totalMinutes / 60;
    
    // Calculate available hours considering parallel work by multiple members
    const availableHours = this.calculateAvailableHours(dueDate, constraints) * memberCount;
    
    return {
      feasible: requiredHours <= availableHours * 0.8, // 80% utilization buffer
      requiredHours,
      availableHours,
    };
  }

  /**
   * Distribute tasks evenly across team members
   */
  static balanceWorkload(subtasks: AISubtask[]): AISubtask[] {
    const memberWorkload: Record<string, number> = {};
    
    // Calculate current workload per member
    subtasks.forEach(task => {
      if (!memberWorkload[task.assignee]) {
        memberWorkload[task.assignee] = 0;
      }
      memberWorkload[task.assignee] += task.estimatedMinutes;
    });

    // Sort members by current workload (ascending)
    const sortedMembers = Object.keys(memberWorkload)
      .sort((a, b) => memberWorkload[a] - memberWorkload[b]);

    // Reassign tasks to balance workload
    const balancedTasks = [...subtasks];
    let memberIndex = 0;

    balancedTasks.forEach(task => {
      // Assign to member with least workload
      const assignedMember = sortedMembers[memberIndex % sortedMembers.length];
      task.assignee = assignedMember;
      
      // Update workload tracking
      memberWorkload[assignedMember] += task.estimatedMinutes;
      
      // Re-sort members by workload for next assignment
      sortedMembers.sort((a, b) => memberWorkload[a] - memberWorkload[b]);
      memberIndex++;
    });

    return balancedTasks;
  }
}
