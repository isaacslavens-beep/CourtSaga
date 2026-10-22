import type { Saver } from "../diary/store";
import { addEntry, removeEntry, reorderEntries, updateEntry } from "./actions";

/** How a diary page keeps what the fan changes: the server actions, handed to the log's store */
export const saver: Saver = { add: addEntry, update: updateEntry, remove: removeEntry, reorder: reorderEntries };
